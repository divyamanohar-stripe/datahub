package server

import play.api.Configuration
import play.api.Logger
import play.core.server.AkkaHttpServer
import play.core.server.AkkaHttpServerProvider
import play.core.server.ServerProvider
import akka.http.scaladsl.ConnectionContext
import akka.http.scaladsl.settings.ParserSettings
import com.typesafe.config.ConfigMemorySize

/** A custom Akka HTTP server with advanced configuration. */
class CustomAkkaHttpServer(context: AkkaHttpServer.Context) extends AkkaHttpServer(context) {

  protected override def createParserSettings(): ParserSettings = {
    val defaultSettings: ParserSettings = super.createParserSettings()
    val maybeServerConfig = Option(context.config.configuration.get[Configuration]("play.server.akka"))

    val defaultMaxHeaders = 256
    val defaultMaxHeaderValueLen = ConfigMemorySize.ofBytes(128*1024)
    val maxHeaderCount = maybeServerConfig.flatMap(_.getOptional[Int]("max-headers")).getOrElse(defaultMaxHeaders)
    val maxHeaderValueLen = maybeServerConfig.flatMap(_.getOptional[ConfigMemorySize]("max-header-value-len")).getOrElse(defaultMaxHeaderValueLen)

    val logger = Logger(classOf[CustomAkkaHttpServer])
    logger.info(s"Setting max header count to: $maxHeaderCount")
    logger.info(s"Setting max header val len to: $maxHeaderValueLen")

    defaultSettings
      .withMaxHeaderCount(maxHeaderCount)
      .withMaxHeaderValueLength(maxHeaderValueLen.toBytes.toInt)
  }
}

/** A factory that instantiates a CustomAkkaHttpServer. */
class CustomAkkaHttpServerProvider extends ServerProvider {
  def createServer(context: ServerProvider.Context) = {
    val serverContext = AkkaHttpServer.Context.fromServerProviderContext(context)
    new CustomAkkaHttpServer(serverContext)
  }
}
